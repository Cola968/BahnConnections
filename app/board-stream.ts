/** Read bounded NDJSON records, including records split across UTF-8 chunks. */
export async function readBoardStream<T>(response:Response,signal:AbortSignal,onRecord:(record:T)=>void) {
  if(!response.body)throw new Error('Leere Tafelantwort');
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',bytes=0;
  const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
  try {
    while(true){signal.throwIfAborted();const {value,done}=await reader.read();signal.throwIfAborted();
      if(value){bytes+=value.length;if(bytes>8_000_000)throw new Error('Tafelantwort zu groß');pending+=decoder.decode(value,{stream:true});}
      if(done)pending+=decoder.decode();
      let newline;while((newline=pending.indexOf('\n'))>=0){const line=pending.slice(0,newline);pending=pending.slice(newline+1);if(line.trim())onRecord(JSON.parse(line) as T);}
      if(done){if(pending.trim())onRecord(JSON.parse(pending) as T);break;}
    }
  }finally{signal.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
