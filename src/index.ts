import { Router } from './infra/Router';
import { LoginLayout } from "./app";
import {AuthPage} from "./routes/AuthPage";

const router = new Router();
const authPage = new AuthPage();
(window as any).authPage = authPage;
(window as any).router = router;
router.addRoute('/auth', authPage, LoginLayout);
router.init();
router.navigate('/auth');

console.log('App started');