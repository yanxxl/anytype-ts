export enum BlockType {
	Dashboard	 = 'dashboard',
	Page		 = 'page',
	Dataview	 = 'dataview',
	Layout		 = 'layout',
	
	Text		 = 'text',
	File		 = 'file',
	Image		 = 'image',
	Video		 = 'video',
	Bookmark	 = 'bookmark',
	Icon		 = 'icon',
	Div			 = 'div',
	Link		 = 'link',
	Cover		 = 'cover',
	Property	 = 'property',
};

export enum BlockPosition {
	None	 = 0,
	Before	 = 1,
	After	 = 2,
	Left	 = 3,
	Right	 = 4,
	Inner	 = 5,
};

export interface Restrictions {
	read: boolean;
	edit: boolean;
	remove: boolean;
	drag: boolean;
	dropOn: boolean;
};

export interface Block {
	id: string;
	type: BlockType;
	restrictions?: Restrictions;
	parentId?: string;
	fields: any;
	content: any;
	childrenIds: string[];
	childBlocks: Block[];
};