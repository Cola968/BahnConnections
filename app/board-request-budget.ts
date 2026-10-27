/** Shared by every board producer, not one semaphore per effect/batch. */
function createRequestBudget(limit:number) {
  let running=0;
  const waiting:Array<()=>void>=[];
  return function run<T>(work:()=>Promise<T>,signal?:AbortSignal):Promise<T> {
    return new Promise<T>((resolve,reject)=>{
      let started=false;
      const abort=()=>{
        if(started)return; // The running fetch owns its AbortSignal.
        const index=waiting.indexOf(start);
        if(index>=0)waiting.splice(index,1);
        reject(signal?.reason??new DOMException('Abgebrochen','AbortError'));
      };
      const start=()=>{
        if(signal?.aborted){abort();return;}
        started=true;
        signal?.removeEventListener('abort',abort);
        running++;
        Promise.resolve().then(work).then(resolve,reject).finally(()=>{
          running--;
          while(running<limit&&waiting.length)waiting.shift()!();
        });
      };
      if(signal?.aborted){abort();return;}
      signal?.addEventListener('abort',abort,{once:true});
      if(running<limit)start();else waiting.push(start);
    });
  };
}

export const boardTripRequest=createRequestBudget(6);
