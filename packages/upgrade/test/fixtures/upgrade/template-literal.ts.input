export function template(info: object): string {
  let text = '';

  text += `
    <module>
    <info argumentOne="${info.one}" argumentTwo="${info.two}"/>
    </module>`;

  text += `
    <module>
    <info argumentOne="${info.two}" argumentTwo="${info.three}"/>
    <info argumentOne="${info.two}" argumentTwo="${info.three}"/>
    </module>`;

  /* @ts-expect-error @rehearsal TODO TS2339: Property 'three' does not exist on type 'object'. */
  text += `<module>
    <info argumentOne="${info.three}" argumentTwo="${info.four}"/>
    <info argumentOne="${info.three}" argumentTwo="${info.four}"/>
    <info argumentOne="${info.three}" argumentTwo="${info.four}"/>
    </module>`;

  return text;
}
