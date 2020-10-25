import * as React from 'react';
import { I, DataUtil } from 'ts/lib';
import { Icon, Input, Switch } from 'ts/component';
import { commonStore } from 'ts/store';
import { observer } from 'mobx-react';

interface Props extends I.Menu {};

const Constant = require('json/constant.json');

@observer
class MenuRelationEdit extends React.Component<Props, {}> {

	timeout: number = 0;
	
	constructor(props: any) {
		super(props);
		
		this.onType = this.onType.bind(this);
		this.onDateSettings = this.onDateSettings.bind(this);
	};

	render () {
		const { param } = this.props;
		const { data } = param;
		const { relationKey, view } = data;
		const relation = view.relations.find((it: I.ViewRelation) => { return it.key == relationKey; });

		let current = null;
		let options = null;

		if (relation) {
			current = (
				<div id="relation-type" className={'item ' + (commonStore.menuIsOpen('dataviewRelationType') ? 'active' : '')} onClick={this.onType} onMouseEnter={this.onType}>
					<Icon className={'relation c-' + DataUtil.relationClass(relation.format)} />
					<div className="name">{Constant.relationName[relation.format]}</div>
					<Icon className="arrow" />
				</div>
			);

			if (relation.format == I.RelationType.Date) {
				options = (
					<React.Fragment>
						<div className="line" />
						<div className="item">
							<Icon className="clock" />
							<div className="name">Include time</div>
							<Switch value={relation.isVisible} className="green" onChange={(e: any, v: boolean) => { }} />
						</div>

						<div id="menu-date-settings" className="item" onClick={this.onDateSettings} onMouseEnter={this.onDateSettings}>
							<Icon className="settings" />
							<div className="name">Preferences</div>
							<Icon className="arrow" />
						</div>
					</React.Fragment>
				);
			};
		} else {
			current = (
				<div id="relation-type" className={'item ' + (commonStore.menuIsOpen('dataviewRelationType') ? 'active' : '')} onClick={this.onType}>
					<div className="name">Select type</div>
					<Icon className="arrow" />
				</div>
			);
		};
		
		return (
			<div>
				<div className="sectionName">Relation name</div>
				<div className="wrap">
					<Input value={relation ? relation.name : ''}  />
				</div>
				<div className="sectionName">Relation type</div>
				{current}
				{options}
				<div className="line" />
				<div className="item">
					<Icon className="copy" />
					<div className="name">Duplicate</div>
				</div>
				<div className="item">
					<Icon className="trash" />
					<div className="name">Delete relation</div>
				</div>
			</div>
		);
	};

	componentWillUnmount () {
		window.clearTimeout(this.timeout);
	};
	
	onType (e: any) {
		const { param } = this.props;
		const { data } = param;
		
		commonStore.menuClose('dataviewRelationType');
		commonStore.menuClose('dataviewDate');

		window.clearTimeout(this.timeout);
		this.timeout = window.setTimeout(() => {
			commonStore.menuOpen('dataviewRelationType', { 
				element: '#relation-type',
				offsetX: 208,
				offsetY: 4,
				type: I.MenuType.Vertical,
				vertical: I.MenuDirection.Center,
				horizontal: I.MenuDirection.Left,
				data: {
					onSelect: (item: any) => {
						console.log('Type', item);
					},
					...data
				}
			});
		}, Constant.delay.menu);
	};

	onDateSettings (e: any) {
		const { param } = this.props;

		commonStore.menuClose('dataviewRelationType');
		commonStore.menuClose('dataviewDate');

		window.clearTimeout(this.timeout);
		this.timeout = window.setTimeout(() => {
			commonStore.menuOpen('dataviewDate', { 
				element: '#menu-date-settings',
				offsetX: 224,
				offsetY: -38,
				type: I.MenuType.Vertical,
				vertical: I.MenuDirection.Bottom,
				horizontal: I.MenuDirection.Left,
				data: {
					formatDate: 'Jul 1, 2020',
					formatTime: '12 hour',
				}
			});
		}, Constant.delay.menu);
	};
	
};

export default MenuRelationEdit;