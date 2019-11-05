import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { RouteComponentProps } from 'react-router';
import { MenuMain, Block, Smile, HeaderMainEdit as Header, DragProvider, SelectionProvider } from 'ts/component';
import { I, Util } from 'ts/lib'; 
import { observer, inject } from 'mobx-react';

interface Props extends RouteComponentProps<any> {
	blockStore?: any;
};

const $ = require('jquery');

@inject('blockStore')
@observer
class PageMainEdit extends React.Component<Props, {}> {
	
	refSelection: any = null;
	
	constructor (props: any) {
		super(props);
	};
	
	render () {
		const { blockStore } = this.props;
		const { tree } = blockStore;
		
		let n = 0;
		
		return (
			<SelectionProvider>
				<DragProvider >
					<Header {...this.props} />
					<MenuMain />
							
					<div className="wrapper">
						<div className="editor">
							<div className="blocks">
								{tree.map((item: I.Block, i: number) => { 
									n = Util.incrementBlockNumber(item, n);
									return <Block key={item.header.id} {...item} number={n} index={i} />
								})}
							</div>
						</div>
					</div>
				</DragProvider>
			</SelectionProvider>
		);
	};
	
};

export default PageMainEdit;