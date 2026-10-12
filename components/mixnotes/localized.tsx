"use client";
import {createContext,useContext,Children,isValidElement,cloneElement,type ReactNode,type ReactElement} from 'react';
import {translateUi,type Language} from '@/lib/ui-translations';
export const LanguageContext=createContext<Language>('tr');
export function L({text}:{text:string}){return <>{translateUi(text,useContext(LanguageContext))}</>;}
// Translate declared UI attributes without touching track names, form values or notes.
function attributes(children:ReactNode,language:Language):ReactNode{
 return Children.map(children,child=>{
  if(!isValidElement(child))return child;
  const element=child as ReactElement<Record<string,unknown>>;
  const props=element.props;
  const keys=typeof element.type==='string'?String(props['data-localize-attrs']??'').split(','):['label','hint'];
  const patch:Record<string,unknown>={};
  for(const key of keys)if(typeof props[key]==='string')patch[key]=translateUi(props[key] as string,language);
  if(props.children!==undefined)patch.children=attributes(props.children as ReactNode,language);
  return cloneElement(element,patch);
 });
}
export function Localized({children}:{children:ReactNode}){return <>{attributes(children,useContext(LanguageContext))}</>;}
