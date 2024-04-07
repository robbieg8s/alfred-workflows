// This is based on
// https://devblogs.microsoft.com/typescript/announcing-typescript-3-7/#more-recursive-type-aliases
// but i want JsonObject to have a name also

export interface JsonObject {
  [key: string]: Json | undefined;
}
export type Json = string | number | boolean | null | Json[] | JsonObject;

export const isJsonString = (json: Json): json is string => {
  return "string" === typeof json;
};

export const toJsonString = (json: Json): string | undefined => {
  return isJsonString(json) ? json : undefined;
};

export const isJsonNumber = (json: Json): json is number => {
  return "number" === typeof json;
};

export const toJsonNumber = (json: Json): number | undefined => {
  return isJsonNumber(json) ? json : undefined;
};

export const isJsonBoolean = (json: Json): json is boolean => {
  return "boolean" === typeof json;
};

export const toJsonBoolean = (json: Json): boolean | undefined => {
  return isJsonBoolean(json) ? json : undefined;
};

export const isJsonNull = (json: Json): json is null => {
  return null === json;
};

export const toJsonNull = (json: Json): null | undefined => {
  return isJsonNull(json) ? json : undefined;
};

export const isJsonArray = (json: Json): json is Json[] => {
  return Array.isArray(json);
};

export const toJsonArray = (json: Json): Json[] | undefined => {
  return isJsonArray(json) ? json : undefined;
};

export const isJsonObject = (json: Json): json is JsonObject => {
  return "object" === typeof json && !Array.isArray(json);
};

export const toJsonObject = (json: Json): JsonObject | undefined => {
  return isJsonObject(json) ? json : undefined;
};

export const jsonParse = (jsonString: string): Json => {
  return JSON.parse(jsonString);
};

export const jsonTypeOf = (json: Json): string => {
  if ("object" === typeof json) {
    if (null === json) {
      return "null";
    } else if (Array.isArray(json)) {
      return "array";
    } else {
      return "object";
    }
  } else {
    return typeof json;
  }
};
