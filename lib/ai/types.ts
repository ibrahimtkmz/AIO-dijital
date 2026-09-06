/** Phase 2 contract. Validate provider JSON with Zod before a News row is updated. */
export type AiNewsOutput={title:string;shortTitle:string;script:string;description:string;hashtags:string[];category:string};
export interface AiService { generate(input:{title:string;content:string;category?:string}):Promise<AiNewsOutput>; }
