export const avatarIds = ['headphones','cat','robot','alien','vinyl'] as const;
export type AvatarId = typeof avatarIds[number];
export const avatars: {id:AvatarId;name:string;color:string;ink:string}[] = [
  {id:'headphones',name:'Kulaklıklı DJ',color:'#ffc28f',ink:'#522b44'},
  {id:'cat',name:'Gece kedisi',color:'#cbb4ff',ink:'#39234f'},
  {id:'robot',name:'Beat robotu',color:'#97e4dc',ink:'#1e4548'},
  {id:'alien',name:'Kozmik dinleyici',color:'#ffafc9',ink:'#602b56'},
  {id:'vinyl',name:'Plak koleksiyoncusu',color:'#a9c7ff',ink:'#263c65'},
];
