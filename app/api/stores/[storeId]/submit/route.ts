import { NextResponse } from "next/server";

import {
  requireUnblockedUser,
} from "@/lib/store/auth";

import {
  serializeStore,
  toApiError,
} from "@/lib/store/http";

import {
  submitCompleteStore,
} from "@/lib/store/submission";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    storeId: string;
  }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const user =
      await requireUnblockedUser(
        request,
      );

    const {
      storeId,
    } = await context.params;

    const store =
      await submitCompleteStore(
        user.uid,
        storeId,
      );

    return NextResponse.json({
      store:
        serializeStore(
          store,
        ),
    });
  } catch (error) {
    const apiError =
      toApiError(error);

    return NextResponse.json(
      {
        error:
          apiError.message,
      },
      {
        status:
          apiError.status,
      },
    );
  }
}

