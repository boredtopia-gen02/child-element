import { vikeHandler } from "./server/vike-handler";
import { verifySignatureHandler } from "./server/verify-signature";
import { handleSignAction } from "./server/sign-action";
import { createHandler } from "@universal-middleware/hono";
import { Hono } from "hono";

const app = new Hono();

// API route สำหรับ verify signature
app.post("/api/verify-signature", verifySignatureHandler);

// API route สำหรับ sign action
app.post("/api/sign-action", async (c) => {
  try {
    const body = await c.req.json();
    const result = await handleSignAction(body);
    
    if (result.success) {
      return c.json(result);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error('Error in /api/sign-action:', error);
    return c.json({ 
      success: false, 
      error: 'Invalid request format' 
    }, 400);
  }
});

/**
 * Vike route
 *
 * @link {@see https://vike.dev}
 **/
app.all("*", createHandler(vikeHandler)());

export default app;
