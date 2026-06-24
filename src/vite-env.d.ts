//typescript يسمح بالتعامل مع ملفات ال css
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
