/** 第三方无类型模块的宽松声明（P1 typecheck 过渡） */

declare module 'bpmn-js/lib/NavigatedViewer' {
  const NavigatedViewer: any
  export default NavigatedViewer
}

declare module 'bpmn-js/lib/Modeler' {
  const Modeler: any
  export default Modeler
}

declare module 'bpmn-js/lib/Viewer' {
  const Viewer: any
  export default Viewer
}

declare module 'bpmn-js/lib/features/modeling/Modeling' {
  const Modeling: any
  export default Modeling
}

declare module 'diagram-js/lib/features/selection/Selection' {
  const Selection: any
  export default Selection
}

declare module 'bpmn-js/lib/util/ModelUtil' {
  export function getBusinessObject(element: any): any
  export function is(element: any, type: string): boolean
}

declare module '@/components/FcDesigner' {
  export const FcDesigner: any
  export const formCreate: any
  export const designer: any
  const _default: any
  export default _default
}

declare module 'bpmn-js-properties-panel' {
  const _: any
  export default _
}

declare module 'bpmn-js-properties-panel/lib/provider/bpmn' {
  const _: any
  export default _
}

declare module 'camunda-bpmn-moddle/resources/camunda.json' {
  const _: any
  export default _
}

declare module 'bpmn-moddle/resources/bpmn.json' {
  const _: any
  export default _
}
