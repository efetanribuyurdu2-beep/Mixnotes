import {database} from './raw';
export async function studioNotebook(owner:string){const row=await database().prepare('SELECT payload,revision FROM studio_notebooks WHERE owner_id=?').bind(owner).first<{payload:string;revision:number}>();return {notebook:row?JSON.parse(row.payload):{recipes:[],checklists:{},techniques:[]},revision:row?.revision||0};}
