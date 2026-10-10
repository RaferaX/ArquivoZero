import './style.css';
import { initMenu } from './menu';
import { loadFonts } from './visual/fonts';

loadFonts().then(initMenu);