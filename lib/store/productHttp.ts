import {
  validateProductInput,
} from "./productDomain";

import {
  ProductRepositoryError,
  type ProductRecord,
} from "./productRepository";

export class ProductHttpError
  extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function parseProductInput(
  input: unknown,
) {
  try {
    return validateProductInput(
      input,
    );
  } catch (error) {
    throw new ProductHttpError(
      400,
      error instanceof Error
        ? error.message
        : "Datos de producto inválidos.",
    );
  }
}

export function serializeProduct(
  product: ProductRecord,
) {
  return {
    id: product.id,

    ownerUid:
      product.ownerUid,

    storeId:
      product.storeId,

    title:
      product.title,

    description:
      product.description,

    imageUrls:
      product.imageUrls,

    categoryId:
      product.categoryId,

    priceType:
      product.priceType,

    priceAmount:
      product.priceAmount,

    visibility:
      product.visibility,

    createdAt:
      product.createdAt
        .toDate()
        .toISOString(),

    updatedAt:
      product.updatedAt
        .toDate()
        .toISOString(),
  };
}

export function toProductApiError(
  error: unknown,
): {
  status: number;
  message: string;
} {
  if (
    error instanceof
      ProductRepositoryError ||
    error instanceof
      ProductHttpError
  ) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  console.error(
    "Unexpected product API error:",
    error,
  );

  return {
    status: 500,
    message:
      "Ocurrió un error interno.",
  };
}
