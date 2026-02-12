/**
 * Primitive reusable schemas.
 */

import { Schema } from "effect";

/**
 * A non-empty string schema.
 *
 * @public
 */
export const NonEmptyString = Schema.String.pipe(Schema.minLength(1));

/**
 * A positive integer schema.
 *
 * @public
 */
export const PositiveInteger = Schema.Number.pipe(Schema.int(), Schema.positive());
