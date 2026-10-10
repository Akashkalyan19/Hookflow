import type { Types } from "mongoose";

export function endpointView(endpoint: {
  _id: Types.ObjectId;
  name: string;
  url: string;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: endpoint._id.toString(), name: endpoint.name, url: endpoint.url, enabled: endpoint.enabled,
    createdAt: endpoint.createdAt ?? new Date(0), updatedAt: endpoint.updatedAt ?? new Date(0),
  };
}
