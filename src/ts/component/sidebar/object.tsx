import * as React from 'react';
import { observer } from 'mobx-react';
import { AutoSizer, CellMeasurer, InfiniteLoader, List, CellMeasurerCache } from 'react-virtualized';
import { Title, Filter, Icon, Button, Label } from 'Component';
import { I, U, J, S, translate, Storage, sidebar, keyboard, analytics, Action } from 'Lib';

import Item from './object/item';

interface State {
	isLoading: boolean;
};

const LIMIT = 20;
const HEIGHT_SECTION = 28;
const HEIGHT_ITEM_DEFAULT = 64;
const HEIGHT_ITEM_SYSTEM = 36;

const SidebarObject = observer(class SidebarObject extends React.Component<{}, State> {
	
	state = {
		isLoading: false,
	};
	node = null;
	refFilter = null;
	refList = null;
	cache: any = {};
	offset = 0;
	sortId: I.SortId = I.SortId.Updated;
	sortType: I.SortType = I.SortType.Desc;
	orphan = false;
	type: I.ObjectContainerType = I.ObjectContainerType.Object;
	searchIds: string[] = null;
	filter = '';
	timeoutFilter = 0;
	n = -1;
	selected: string[] = null;
	startIndex = -1;
	currentIndex = -1;
	pages = 0;
	page = 0;

	constructor (props: any) {
		super(props);

		this.onMore = this.onMore.bind(this);
		this.onSwitchType = this.onSwitchType.bind(this);
		this.onFilterChange = this.onFilterChange.bind(this);
		this.onFilterClear = this.onFilterClear.bind(this);
		this.onAdd = this.onAdd.bind(this);
		this.onScroll = this.onScroll.bind(this);
		this.loadMoreRows = this.loadMoreRows.bind(this);
	};

    render() {
		const { isLoading } = this.state;
		const items = this.getItems();
		const isAllowedObject = this.isAllowedObject();
		const typeOptions = this.getTypeOptions();

		const rowRenderer = (param: any) => {
			const item: any = items[param.index];
			if (!item) {
				return null;
			};

			const allowedDelete = S.Block.isAllowed(item.restrictions, [ I.RestrictionObject.Delete ]);

			let content = null;
			if (item.isSection) {
				const cn = [ 'item', 'isSection' ];

				if (!param.index) {
					cn.push('first');
				};

				content = (
					<div className={cn.join(' ')} style={param.style}>
						{translate(U.Common.toCamelCase([ 'common', item.id ].join('-')))}
					</div>
				);
			} else {
				content = (
					<Item
						item={item}
						style={param.style}
						allowSystemLayout={true}
						isLocked={!allowedDelete}
						onClick={e => this.onClick(e, item)}
						onContext={() => this.onContext(item)}
						onMouseEnter={() => this.onOver(item)}
						onMouseLeave={() => this.onOut()}
					/>
				);
			};

			return (
				<CellMeasurer
					key={param.key}
					parent={param.parent}
					cache={this.cache}
					columnIndex={0}
					rowIndex={param.index}
				>
					{content}
				</CellMeasurer>
			);
		};

        return (
			<div 
				id="containerObject"
				ref={ref => this.node = ref}
			>
				<div className="inner">
					<div className="head">
						<div className="titleWrap" onClick={() => sidebar.objectContainerToggle()}>
							<div className="side left">
								<Icon className="back withBackground" />
								<Title text={translate('commonAllContent')} />
							</div>
							<div className="side right">
								<Icon id="button-object-more" className="more withBackground" onClick={this.onMore} />
							</div>
						</div>

						<div id="tabs" className="tabs">
							<div className="inner">
								{typeOptions.map(it => {
									const cn = [ 'tab' ];
									if (this.type == it.id) {
										cn.push('active');
									};

									return (
										<div key={it.id} className={cn.join(' ')} onClick={() => this.onSwitchType(it.id)}>
											{it.name}
										</div>
									);
								})}
							</div>

							<Icon id="arrowLeft" className="arrow left withBackground" onClick={() => this.onTabArrow(-1)} />
							<Icon id="arrowRight" className="arrow right withBackground" onClick={() => this.onTabArrow(1)} />

							<div id="gradientLeft" className="gradient left" />
							<div id="gradientRight" className="gradient right" />
						</div>

						<div className="sides sidesFilter">
							<div className="side left">
								<Filter 
									ref={ref => this.refFilter = ref}
									icon="search"
									placeholder={translate('commonSearch')}
									onChange={this.onFilterChange}
									onClear={this.onFilterClear}
								/>
							</div>
							<div className="side right">
								{isAllowedObject ? <Button id="button-object-create" color="blank" className="c28" text={translate('commonNew')} onClick={this.onAdd} /> : ''}
							</div>
						</div>

						{this.orphan ? <Label text={translate('sidebarObjectOrphanLabel')} /> : ''}
					</div>

					<div className="body">
						{this.cache && items.length && !isLoading ? (
							<div className="items customScrollbar">
								<InfiniteLoader
									rowCount={items.length + 1}
									loadMoreRows={this.loadMoreRows}
									isRowLoaded={({ index }) => !!items[index]}
									threshold={LIMIT}
								>
									{({ onRowsRendered }) => (
										<AutoSizer className="scrollArea">
											{({ width, height }) => (
												<List
													ref={ref => this.refList = ref}
													width={width}
													height={height}
													deferredMeasurmentCache={this.cache}
													rowCount={items.length}
													rowHeight={({ index }) => this.getRowHeight(items[index])}
													rowRenderer={rowRenderer}
													onRowsRendered={onRowsRendered}
													overscanRowCount={10}
													scrollToAlignment="center"
													onScroll={this.onScroll}
												/>
											)}
										</AutoSizer>
									)}
								</InfiniteLoader>
							</div>
						) : ''}
					</div>
				</div>
			</div>
		);
    };

	componentDidMount () {
		const storage = this.storageGet();

		if (storage) {
			this.type = storage.type || I.ObjectContainerType.Object;
			this.orphan = storage.orphan || false;

			const sort = storage.sort[this.type];

			if (sort) {
				this.sortId = sort.id;
				this.sortType = sort.type;
			};
		};

		this.refFilter.focus();
		this.rebind();
		this.checkPage();
		this.load(true);

		analytics.event('ScreenLibrary');
	};

	componentDidUpdate () {
		const items = this.getItems();

		this.cache = new CellMeasurerCache({
			fixedWidth: true,
			defaultHeight: i => this.getRowHeight(items[i]),
			keyMapper: i => (items[i] || {}).id,
		});

		this.setActive();
		this.checkPage();
	};

	componentWillUnmount(): void {
		window.clearTimeout(this.timeoutFilter);
		this.unbind();
	};

	rebind () {
		this.unbind();

		$(window).on('keydown.sidebarObject', e => this.onKeyDown(e));
		$(this.node).on('click', e => {
			if (!this.refFilter.isFocused) {
				const value = this.refFilter.getValue();
				const length = value.length;

				this.refFilter.focus();
				this.refFilter.setRange({ from: length, to: length });
			};
		});
	};

	unbind () {
		$(window).off('keydown.sidebarObject');
		$(this.node).off('click');
	};

	load (clear: boolean, callBack?: (message: any) => void) {
		const option = this.getSortOption();
		const template = S.Record.getTemplateType();
		const limit = this.offset + J.Constant.limit.menuRecords;
		const fileLayouts = [ I.ObjectLayout.File, I.ObjectLayout.Pdf ];

		let sorts: I.Sort[] = [];
		let filters: I.Filter[] = [
			{ relationKey: 'layout', condition: I.FilterCondition.NotEqual, value: I.ObjectLayout.Participant },
			{ relationKey: 'type', condition: I.FilterCondition.NotEqual, value: template?.id },
		];

		if (option) {
			sorts.push({ relationKey: option.relationKey, type: this.sortType });
		} else {
			sorts = sorts.concat([
				{ type: I.SortType.Desc, relationKey: 'createdDate' },
				{ type: I.SortType.Asc, relationKey: 'name' },
			]);
		};

		if (this.searchIds) {
			filters.push({ relationKey: 'id', condition: I.FilterCondition.In, value: this.searchIds || [] });
		};

		switch (this.type) {
			case I.ObjectContainerType.Object: {
				const skipped = U.Object.getFileAndSystemLayouts().concat(U.Object.getSetLayouts()).concat([ I.ObjectLayout.Bookmark ]);

				filters.push({ relationKey: 'layout', condition: I.FilterCondition.NotIn, value: skipped });
				break;
			};

			case I.ObjectContainerType.List: {
				filters.push({ relationKey: 'layout', condition: I.FilterCondition.In, value: U.Object.getSetLayouts() });
				break;
			};

			case I.ObjectContainerType.Type: {
				filters.push({ relationKey: 'layout', condition: I.FilterCondition.Equal, value: I.ObjectLayout.Type });
				break;
			};

			case I.ObjectContainerType.File: {
				filters.push({ relationKey: 'layout', condition: I.FilterCondition.In, value: fileLayouts });
				break;
			};

			case I.ObjectContainerType.Media: {
				filters = filters.concat([
					{ relationKey: 'layout', condition: I.FilterCondition.In, value: U.Object.getFileLayouts().filter(it => !fileLayouts.includes(it)) },
				]);
				break;
			};

			case I.ObjectContainerType.Bookmark: {
				filters.push({ relationKey: 'layout', condition: I.FilterCondition.Equal, value: I.ObjectLayout.Bookmark });
				break;
			};

			case I.ObjectContainerType.Relation: {
				filters.push({ relationKey: 'layout', condition: I.FilterCondition.Equal, value: I.ObjectLayout.Relation });
				break;
			};
		};

		if (this.orphan) {
			filters = filters.concat([
				{ relationKey: 'links', condition: I.FilterCondition.Empty, value: null },
				{ relationKey: 'backlinks', condition: I.FilterCondition.Empty, value: null },
			]);
		};

		if (clear) {
			this.setState({ isLoading: true });
			S.Record.recordsSet(J.Constant.subId.allObject, '', []);
		};

		U.Data.searchSubscribe({
			subId: J.Constant.subId.allObject,
			filters,
			sorts,
			limit,
			keys: J.Relation.default.concat([ 'lastModifiedDate' ]),
			ignoreHidden: true,
			ignoreDeleted: true,
		}, (message: any) => {
			this.setState({ isLoading: false });

			if (clear) {
				const records = this.getRecords();
				const first = records.length ? records[0] : null;

				if (first) {
					U.Object.openAuto(first);
					this.setActive(first);
				};
			};

			if (callBack) {
				callBack(message);
			};
		});
	};

	loadMoreRows ({ startIndex, stopIndex }) {
		return new Promise((resolve, reject) => {
			this.offset += J.Constant.limit.menuRecords;
			this.load(false, resolve);
		});
	};

	loadSearchIds (clear: boolean) {
		if (this.filter) {
			U.Data.search({
				filters: [],
				sorts: [],
				fullText: this.filter,
				keys: [ 'id' ],
			}, (message: any) => {
				this.searchIds = (message.records || []).map(it => it.id);
				this.load(clear);
			});
		} else {
			this.searchIds = null;
			this.load(clear);
		};
	};

	getSortOption () {
		return U.Menu.getObjectContainerSortOptions(this.sortId, this.sortType, this.orphan).find(it => it.id == this.sortId);
	};

	getRecords () {
		return S.Record.getRecords(J.Constant.subId.allObject);
	};

	getItems () {
		let records = this.getRecords();
		if (this.withSections()) {
			const option = this.getSortOption();

			records = U.Data.groupDateSections(records, option.relationKey, {}, this.sortType);
		};
		return records;
	};

	onClick (e: any, item: any) {
		const withCommand = e.metaKey || e.ctrlKey || e.shiftKey;

		if (withCommand) {
			this.selected = this.selected || [];

			if (e.metaKey || e.ctrlKey) {
				this.selected = this.selected.includes(item.id) ? this.selected.filter(it => it != item.id) : this.selected.concat(item.id);
			} else 
			if (e.shiftKey) {
				this.selected = this.selected.concat(item.id);
			};

			this.renderSelection();
		} else {
			U.Object.openAuto(item);
		};

		analytics.event('LibraryResult');
	};

	onContext (item: any) {
		const objectIds = this.selected ? this.selected : [ item.id ];
		const { x, y } = keyboard.mouse.page;

		S.Menu.open('dataviewContext', {
			rect: { width: 0, height: 0, x: x + 4, y },
			data: {
				objectIds,
				subId: J.Constant.subId.allObject,
				route: analytics.route.allObjects,
				allowedLink: true,
			}
		});
	};

	onMore (e: any) {
		e.stopPropagation();

		const options = U.Menu.getObjectContainerSortOptions(this.sortId, this.sortType, this.orphan);

		let menuContext = null;

		S.Menu.open('select', {
			element: '#sidebar #containerObject #button-object-more',
			horizontal: I.MenuDirection.Right,
			offsetY: 4,
			className: 'fixed',
			classNameWrap: 'fromSidebar',
			onOpen: context => menuContext = context,
			data: {
				options,
				noClose: true,
				onSelect: (e: any, item: any) => {
					if ([ I.SortId.All, I.SortId.Orphan ].includes(item.id)) {
						this.orphan = item.id == I.SortId.Orphan;

						analytics.event('ChangeLibraryTypeLink', { type: item.id });
					} else {
						this.sortId = item.id;
						this.sortType = item.type;

						analytics.event('ChangeLibrarySort', { type: item.id, sort: I.SortType[item.type] });
					};

					this.load(true);

					const storage = this.storageGet();
					const options = U.Menu.getObjectContainerSortOptions(this.sortId, this.sortType, this.orphan);
					
					storage.sort[this.type] = { id: item.id, type: item.type };

					this.storageSet(storage);
					menuContext.ref.updateOptions(options);
				},
			}
		});
	};

	onAdd () {
		const details = {
			...this.getDetailsByType(this.type),
			name: this.filter,
		};

		const cb = (id: string) => {
			if (id && this.filter && this.searchIds) {
				this.searchIds = this.searchIds.concat(id);
				this.load(false);
			};

			analytics.event('CreateObject', { route: analytics.route.allObjects })
		};

		if (this.type == I.ObjectContainerType.Bookmark) {
			this.onBookmarkMenu(details, cb);
		} else
		if (this.type == I.ObjectContainerType.Relation) {
			this.onRelationMenu(cb);
		} else {
			keyboard.pageCreate(details, analytics.route.allObjects, (message: any) => {
				cb(message.targetId);
			});
		};
	};

	isAllowedObject (): boolean {
		const canWrite = U.Space.canMyParticipantWrite();

		return canWrite && ![ 
			I.ObjectContainerType.File, 
			I.ObjectContainerType.Media, 
		].includes(this.type);
	};

	onSwitchType (id: string) {
		const storage = this.storageGet();

		this.type = id as I.ObjectContainerType;
		storage.type = this.type;

		this.storageSet(storage);
		this.load(true);

		analytics.event('ChangeLibraryType', { type: id });
	};

	getTypeOptions () {
		return [
			{ id: I.ObjectContainerType.Object, name: translate('sidebarObjectTypeObject') },
			{ id: I.ObjectContainerType.List, name: translate('sidebarObjectTypeList') },
			{ id: I.ObjectContainerType.Media, name: translate('sidebarObjectTypeMedia') },
			{ id: I.ObjectContainerType.Bookmark, name: translate('sidebarObjectTypeBookmark') },
			{ id: I.ObjectContainerType.File, name: translate('sidebarObjectTypeFile') },
			{ id: I.ObjectContainerType.Type, name: translate('sidebarObjectTypeType') },
			{ id: I.ObjectContainerType.Relation, name: translate('sidebarObjectTypeRelation') },
		];
	};

	getDetailsByType (t: I.ObjectContainerType) {
		const details: any = {};

		let type = null;

		switch (t) {
			case I.ObjectContainerType.Bookmark: {
				type = S.Record.getBookmarkType();
				break;
			};

			case I.ObjectContainerType.Type: {
				type = S.Record.getTypeType();
				break;
			};
		};

		if (type) {
			details.type = type.id;
		};

		return details;
	};

	onFilterChange (v: string) {
		window.clearTimeout(this.timeoutFilter);
		this.timeoutFilter = window.setTimeout(() => {
			if (this.filter == v) {
				return;
			};

			this.filter = v;
			this.loadSearchIds(true);

			analytics.event('SearchInput', { route: analytics.route.allObjects })
		}, J.Constant.delay.keyboard);
	};

	onFilterClear () {
		this.searchIds = null;
		this.load(true);
	};

	onBookmarkMenu (details: any, callBack: (id: string) => void) {
		const node = $(this.node);
		const width = node.width() - 32;

		S.Menu.open('dataviewCreateBookmark', {
			element: '#sidebar #containerObject #button-object-create',
			offsetY: 4,
			width,
			className: 'fixed',
			classNameWrap: 'fromSidebar',
			horizontal: I.MenuDirection.Right,
			type: I.MenuType.Horizontal,
			data: {
				details,
				onSubmit: object => callBack(object.id),
			},
		});
	};

	onRelationMenu (callBack: (id: string) => void) {
		const node = $(this.node);
		const width = node.width() - 32;

		S.Menu.open('blockRelationEdit', { 
			element: '#sidebar #containerObject #button-object-create',
			offsetY: 4,
			width,
			className: 'fixed',
			classNameWrap: 'fromSidebar',
			horizontal: I.MenuDirection.Right,
			data: {
				filter: this.filter,
				addCommand: (rootId: string, blockId: string, relation: any, onChange: (message: any) => void) => {
					callBack(relation.id);
				},
				deleteCommand: () => {
				},
			}
		});
	};

	onOver (item: any) {
		if (!keyboard.isMouseDisabled) {
			this.setActive(item);
		};
	};

	onOut () {
		if (!keyboard.isMouseDisabled) {
			this.unsetActive();
		};
	};

	onKeyDown (e: any) {
		if (!this.refFilter.isFocused) {
			return;
		};

		const items = this.getItems();
		const node = $(this.node);

		keyboard.shortcut('arrowup, arrowdown, shift+arrowup, shift+arrowdown', e, (pressed: string) => {
			this.onArrow(pressed.match('arrowdown') ? 1 : -1, !!pressed.match('shift'));
		});

		keyboard.shortcut('escape', e, () => {
			if (this.selected) {
				this.clearSelection();
			} else {
				sidebar.objectContainerToggle();
			};
		});

		if (this.n < 0) {
			return;
		};

		const next = items[this.n];
		if (!next) {
			return;
		};

		const el = node.find(`#item-${next.id}`);
		const isActive = el.hasClass('active');
		const isSelected = el.hasClass('selected');

		if (isActive || isSelected) {
			keyboard.shortcut('arrowright, tab, enter', e, () => {
				e.stopPropagation();
				e.preventDefault();

				this.onClick(e, next);
			});
		};

		if (isActive || isSelected || this.selected) {
			keyboard.shortcut('delete', e, () => {
				e.stopPropagation();
				e.preventDefault();

				const ids = this.selected ? this.selected : [ next.id ];
				Action.archive(ids);
			});
		};
	};

	onScroll () {
		this.renderSelection();
	};

	onArrow (dir: number, isShift: boolean) {
		const items = this.getItems();
		if (!items.length) {
			return;
		};

		const withSections = this.withSections();
		const isList = items.length > (withSections ? 2 : 1);
		const { total } = S.Record.getMeta(J.Constant.subId.allObject, '');

		let item = items[this.n];
		if (isList && items[this.n + dir]?.isSection) {
			this.n += dir;
		};

		const selectNext = () => {
			if (!this.selected) {
				return;
			};

			const item = items[this.currentIndex];

			if (this.currentIndex > this.startIndex) {
				this.selected.push(item.id);
			};
			if (this.currentIndex < this.startIndex) {
				this.selected = this.selected.filter(it => it != item.id);
			};
			this.renderSelection();
        };

        const selectPrevious = () => {
			if (!this.selected) {
				return;
			};

			const item = items[this.currentIndex];

			if (this.currentIndex < this.startIndex) {
				this.selected.push(item.id);
			};
			if (this.currentIndex > this.startIndex) {
				this.selected = this.selected.filter(it => it != item.id);
			};
			this.renderSelection();
        };

		const cb = () => {
			let scrollTo = 0;
			if (isShift) {
				dir > 0 ? selectNext() : selectPrevious();

				this.currentIndex += dir;

				if (isList) {
					if (items[this.currentIndex]?.isSection) {
						this.currentIndex += dir;
					};
					if (this.currentIndex == this.startIndex) {
						this.currentIndex += dir;
					};
				};

				this.currentIndex = Math.max(0, this.currentIndex);
				this.currentIndex = Math.min(items.length - 1, this.currentIndex);

				scrollTo = this.currentIndex;
			} else {
				this.setActive();
				scrollTo = this.n;
			};

			this.refList.scrollToRow(Math.max(0, scrollTo));
		};

		// Initial selection
		if (isShift && !this.selected) {
			if (this.n < 0) {
				if (dir < 0) {
					this.n = items.length - 1;
				} else {
					this.n = 0;
				};
				if (this.n > items.length) {
					this.n = 0;
				};
				item = items[this.n];
			};

			this.selected = [ item.id ];

			if (this.startIndex == -1) {
				this.startIndex = this.n;
				this.currentIndex = this.n;
			};
		};

		if (!isShift) {
			this.clearSelection();
			this.n += dir;

			if (this.n < 0) {
				this.n = items.length - 1;
			};
			if (this.n > items.length) {
				this.n = 0;
			};

			if ((this.n > items.length - 1) && (this.offset < total)) {
				this.offset += J.Constant.limit.menuRecords;
				this.load(false, cb);
			} else {
				if (this.n > items.length - 1) {
					this.n = 0;
				};

				cb();
			};
		} else {
			cb();
		};
	};

	storageGet () {
		const storage = Storage.get('sidebarObject') || {};
		storage.sort = storage.sort || {};
		return storage;
	};

	storageSet (obj: any) {
		Storage.set('sidebarObject', obj);
	};

	renderSelection () {
		const node = $(this.node);

		node.find('.item.selected').removeClass('selected');

		if (this.selected) {
			this.selected.forEach(id => {
				node.find(`#item-${id}`).addClass('selected');
			});
		};
	};

	clearSelection () {
		if (!this.selected) {
			return;
		};

		this.selected = null;
		this.startIndex = -1;
		this.currentIndex = -1;
		this.renderSelection();
	};

	setActive (item?: any) {
		this.unsetActive();

		const items = this.getItems();

		if (!item) {
			item = items[this.n];
		} else {
			this.n = items.findIndex(it => it.id == item.id);
		};

		if (item) {
			$(this.node).find(`#item-${item.id}`).addClass('active');
		};
	};

	unsetActive () {
		$(this.node).find('.item.active').removeClass('active');
	};

	getRowHeight (item: any): number {
		let h = HEIGHT_ITEM_DEFAULT;
		if (U.Object.isTypeOrRelationLayout(item.layout)) {
			h = HEIGHT_ITEM_SYSTEM;
		};
		if (item.isSection) {
			h = HEIGHT_SECTION;
		};
		return h;
	};

	withSections (): boolean {
		return [ I.SortId.Created, I.SortId.Updated ].includes(this.sortId);
	};

	onTabArrow (dir: number) {
		const node = $(this.node);
		const inner = node.find('#tabs > .inner');

		this.page += dir;
		this.checkPage();

		inner.css({ transform: `translate3d(${-this.page * 100}%, 0px, 0px)` });
	};

	checkPage () {
		const node = $(this.node);
		const gradientLeft = node.find('#gradientLeft');
		const gradientRight = node.find('#gradientRight');
		const arrowLeft = node.find('#arrowLeft');
		const arrowRight = node.find('#arrowRight');

		this.calcPages();
		this.page = Math.max(0, this.page);
		this.page = Math.min(this.page, this.pages - 1);

		if (!this.page) {
			gradientLeft.hide();
			arrowLeft.hide();
		} else {
			gradientLeft.show();
			arrowLeft.show();
		};

		if (this.page == this.pages - 1) {
			gradientRight.hide();
			arrowRight.hide();
		} else {
			gradientRight.show();
			arrowRight.show();
		};
	};

	calcPages () {
		const list = this.getTypeOptions();
		const node = $(this.node);
		const width = node.width();
		const items = node.find('#tabs .tab');

		let iw = 0;
		items.each((i, item) => {
			iw += $(item).outerWidth(true);
		});
		iw += 12 * (list.length + 1);

		this.pages = Number(Math.ceil(iw / width)) || 1;
	};

	resize () {
		this.page = 0;
		this.onTabArrow(0);
	};

});

export default SidebarObject;