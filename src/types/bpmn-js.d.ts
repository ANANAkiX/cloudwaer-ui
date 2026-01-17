// bpmn-js 类型声明
declare module 'bpmn-js/lib/Modeler' {
  class BpmnModeler {
    constructor(options: any);
    createDiagram(): Promise<void>;
    importXML(xml: string): Promise<void>;
    saveXML(options?: any): Promise<{ xml: string }>;
    saveSVG(): Promise<{ svg: string }>;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
    get(name: string): any;
    destroy(): void;
  }
  
  export default BpmnModeler;
}

declare module 'bpmn-js/dist/assets/diagram-js.css' {
  const css: string;
  export default css;
}

declare module 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css' {
  const css: string;
  export default css;
}
