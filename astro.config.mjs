// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// Set base and site so pages work when deployed under https://<user>.github.io/<repo>/
export default defineConfig({
	base: '/private/',
	site: 'https://makuhariyusuke.github.io/private/',
});
