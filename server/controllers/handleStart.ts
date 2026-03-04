import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor } from "@utils/index.js";
import { getCurrentDateMT } from "@utils/gameLogic/index.js";

export const handleStart = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    const { visitor } = await getVisitor(credentials, true);

    const currentDate = getCurrentDateMT();
    await visitor.updateDataObject(
      {
        dayStartTimestamp: new Date().toISOString(),
      },
      {
        analytics: [{ analyticName: "starts", profileId, urlSlug, uniqueKey: profileId }],
      },
    );

    return res.json({ success: true, lastPlayedDate: currentDate });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleStart",
      message: "Error starting game",
      req,
      res,
    });
  }
};
