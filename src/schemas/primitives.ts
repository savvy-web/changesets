/**
 * Primitive reusable schemas.
 *
 * @packageDocumentation
 */

import { Schema } from "effect";

/**
 * A non-empty string schema.
 */
export const NonEmptyString = Schema.String.pipe(Schema.minLength(1));

/**
 * A positive integer schema.
 */
export const PositiveInteger = Schema.Number.pipe(Schema.int(), Schema.positive());
