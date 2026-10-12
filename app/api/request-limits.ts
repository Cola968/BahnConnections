export class RequestInputError extends Error {
  readonly status:400|413;
  constructor(message:string,status:400|413=400){super(message);this.name="RequestInputError";this.status=status;}
}
/** Reject oversized JSON before invoking expensive external journey planning APIs. */
export async function readLimitedJson(request:Request,maxBytes=32_768):Promise<unknown> {
  const length=request.headers.get("content-length");
  if(length!==null && Number.isFinite(Number(length)) && Number(length)>maxBytes)
    throw new RequestInputError("Anfrage zu groß",413);
  if(!request.body)throw new RequestInputError("Anfrage enthält keine Daten");
  const reader=request.body.getReader();
  const decoder=new TextDecoder();
  let bytes=0,text="";
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>maxBytes){
        void reader.cancel().catch(()=>{});
        throw new RequestInputError("Anfrage zu groß",413);
      }
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
    try{return JSON.parse(text) as unknown;}catch{throw new RequestInputError("Ungültiges JSON");}
  }finally{reader.releaseLock();}
}
