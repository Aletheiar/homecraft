import base from '../../home.config.js';
import { getSpace } from '../space-config.js';

const space = getSpace();
const names = { library: '手帐图书室', studio: '项目工作室' };
const docks = { library: ['blog', 'writing', 'back'], studio: ['works', 'back'] };

export default {
  ...base,
  name: `${names[space] || names.library} · 本地预览`,
  weather: null,
  dock: docks[space] || docks.library,
};
