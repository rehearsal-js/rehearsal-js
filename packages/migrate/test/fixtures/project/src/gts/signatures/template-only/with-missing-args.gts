import { type TemplateOnlyComponent } from "@ember/component/template-only";

// Missing arugment in Args
interface HelloSignature {
  Args: {};
}

export const Hello: TemplateOnlyComponent<HelloSignature> = <template>
  <span>Hello, {{@name}}!</span>
</template>;

// Missing Args property

interface GoodbyeSignature {}

export const Goodbye: TemplateOnlyComponent<GoodbyeSignature> = <template>
  <span>Goodbye, {{@name}}!</span>
</template>;
