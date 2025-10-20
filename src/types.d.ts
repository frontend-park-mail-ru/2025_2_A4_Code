declare module '*.hbs' {
    const template: (data?: any) => string;
    export default template;
}
