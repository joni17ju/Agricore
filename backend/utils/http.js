import mongoose from 'mongoose';

/** Error with an HTTP status, handled centrally by middleware/errorHandler.js. */
export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/** Validate a path/query id before it reaches Mongo, so a bad id is a 400 not a 500. */
export function toObjectId(value, label = 'id') {
  if (!mongoose.isValidObjectId(value)) throw httpError(400, `Invalid ${label}: ${value}`);
  return new mongoose.Types.ObjectId(String(value));
}

/** Fetch by id or 404. */
export async function findOr404(Model, id, label = Model.modelName) {
  const doc = await Model.findById(toObjectId(id, `${label} id`));
  if (!doc) throw httpError(404, `${label} not found.`);
  return doc;
}
