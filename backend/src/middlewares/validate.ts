import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      return next();
    } catch (err: any) {
      return res
        .status(400)
        .json({
          error: "validation_failed",
          details: err.errors ?? err.message,
        });
    }
  };
}
