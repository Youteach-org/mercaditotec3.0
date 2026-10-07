import { describe, expect, it } from "vitest";

import {
  CommunityDomainError,
  parseCommunityPostCreateInput,
  parseCommunityPostListQuery,
} from "./domain";

describe("parseCommunityPostCreateInput", () => {
  it("accepts a quick notice without image", () => {
    expect(
      parseCommunityPostCreateInput({
        type: "quick_notice",
        title: "Llaves perdidas",
        body: "¿Alguien las vio?",
        location: "Biblioteca",
      }),
    ).toEqual({
      type: "quick_notice",
      title: "Llaves perdidas",
      body: "¿Alguien las vio?",
      location: "Biblioteca",
      imageUrl: null,
    });
  });

  it("requires an image for found items", () => {
    expect(() =>
      parseCommunityPostCreateInput({
        type: "found_item",
        title: "Termo",
        body: "Encontrado en laboratorio",
        location: "Edificio A",
        imageUrl: "",
      }),
    ).toThrow(CommunityDomainError);
  });

  it("trims fields and drops forged server-owned fields", () => {
    expect(
      parseCommunityPostCreateInput({
        type: "found_item",
        title: "  Credencial  ",
        body: "  Encontrada cerca de biblioteca  ",
        location: "  Biblioteca  ",
        imageUrl: " https://example.com/item.jpg ",
        authorUid: "victim",
        status: "resolved",
      }),
    ).toEqual({
      type: "found_item",
      title: "Credencial",
      body: "Encontrada cerca de biblioteca",
      location: "Biblioteca",
      imageUrl: "https://example.com/item.jpg",
    });
  });

  it("enforces title, body and location limits", () => {
    expect(() =>
      parseCommunityPostCreateInput({
        type: "quick_notice",
        title: "x".repeat(81),
        body: "Mensaje",
      }),
    ).toThrow(CommunityDomainError);

    expect(() =>
      parseCommunityPostCreateInput({
        type: "quick_notice",
        title: "Aviso",
        body: "x".repeat(501),
      }),
    ).toThrow(CommunityDomainError);

    expect(() =>
      parseCommunityPostCreateInput({
        type: "quick_notice",
        title: "Aviso",
        body: "Mensaje",
        location: "x".repeat(121),
      }),
    ).toThrow(CommunityDomainError);
  });
});

describe("parseCommunityPostListQuery", () => {
  it("defaults to 20 active posts and clamps limit to 50", () => {
    expect(parseCommunityPostListQuery(new URLSearchParams())).toEqual({
      type: undefined,
      limit: 20,
    });

    expect(
      parseCommunityPostListQuery(new URLSearchParams("limit=999")),
    ).toEqual({
      type: undefined,
      limit: 50,
    });
  });

  it("accepts only known post types", () => {
    expect(
      parseCommunityPostListQuery(new URLSearchParams("type=found_item&limit=4")),
    ).toEqual({
      type: "found_item",
      limit: 4,
    });

    expect(() =>
      parseCommunityPostListQuery(new URLSearchParams("type=admin")),
    ).toThrow(CommunityDomainError);
  });
});
