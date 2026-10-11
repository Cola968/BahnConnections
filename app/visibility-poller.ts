/** One request and one timer per poller; hidden documents own neither. */
export class VisibilityPoller {
  private controller:AbortController|null=null;
  private timer:ReturnType<typeof setTimeout>|null=null;
  private disposed=false;
  private generation=0;
  private job:(signal:AbortSignal)=>Promise<void>;
  private interval:number;
  private visibility:Pick<Document,'hidden'|'addEventListener'|'removeEventListener'>;
  constructor(job:(signal:AbortSignal)=>Promise<void>,interval:number,
    visibility:Pick<Document,'hidden'|'addEventListener'|'removeEventListener'>){
    this.job=job;this.interval=interval;this.visibility=visibility;
    visibility.addEventListener('visibilitychange',this.onVisibility);
    void this.run();
  }
  private onVisibility=()=>{this.cancel();if(!this.visibility.hidden)void this.run();};
  private cancel(){++this.generation;this.controller?.abort();this.controller=null;if(this.timer!==null)clearTimeout(this.timer);this.timer=null;}
  private async run(){
    if(this.disposed||this.visibility.hidden||this.controller)return;
    const generation=this.generation,controller=new AbortController();this.controller=controller;
    try {await this.job(controller.signal);} catch { /* The caller owns error presentation. */ }
    finally {
      if(generation===this.generation&&!this.disposed){this.controller=null;
        if(!this.visibility.hidden)this.timer=setTimeout(()=>{this.timer=null;void this.run();},this.interval);
      }
    }
  }
  dispose(){this.disposed=true;this.cancel();this.visibility.removeEventListener('visibilitychange',this.onVisibility);}
}
