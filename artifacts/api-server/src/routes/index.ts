import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bootRouter from "./boot";
import astroRouter from "./astro";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bootRouter);
router.use(astroRouter);

export default router;
