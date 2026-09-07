import base from '../../web/tailwind.config';
import type { Config } from 'tailwindcss';

const config: Config = { ...base, content: ['./docs/maqueta-capturas/pantallas.html'] };
export default config;
