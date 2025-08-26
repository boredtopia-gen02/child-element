import { vikeHandler } from "./server/vike-handler";
import { telefuncHandler } from "./server/telefunc-handler";
import { verifySignatureHandler } from "./server/verify-signature";
import { createHandler } from "@universal-middleware/hono";
import { Hono } from "hono";

const app = new Hono();

app.post("/_telefunc", createHandler(telefuncHandler)());

// API route สำหรับ verify signature
app.post("/api/verify-signature", verifySignatureHandler);

/**
 * Vike route
 *
 * @link {@see https://vike.dev}
 **/
app.all("*", createHandler(vikeHandler)());

export default app;
