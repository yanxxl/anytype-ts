import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { I } from 'ts/lib';
import { throttle } from 'lodash';

interface Props {
	id: string;
	rootId: string;
	style?: number;
	type?: I.BlockType;
	dropType: I.DragItem;
	className?: string;
	isRootBlock?: boolean;
	onClick?(e: any): void;
};

class DropTarget extends React.Component<Props, {}> {
	
	constructor (props: any) {
		super(props);
		
		this.onClick = this.onClick.bind(this);
	};
	
	render () {
		const { id, rootId, isRootBlock, dropType, type, style, children, className } = this.props;
		
		let cn = [ 'dropTarget' ];
		if (className) {
			cn.push(className);
		};
		
		return (
			<div 
				className={cn.join(' ')} 
				onClick={this.onClick} 
				data-id={id} 
				data-root-id={rootId} 
				data-drop-type={dropType} 
				data-type={type} 
				data-style={style} 
				data-is-root={isRootBlock}
			>
				{children}
			</div>
		);
	};
	
	onClick (e: any) {
		const { onClick } = this.props;
		
		if (onClick) {
			onClick(e);
		};
	};
	
};

export default DropTarget;