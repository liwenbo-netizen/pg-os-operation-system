import { salesScaleStatuses, type SalesScaleStatus } from "../../constants/statuses";
import type { Publisher } from "../../types/domain";

export type PublisherQueueStatusFilter = "all" | SalesScaleStatus;
export type PublisherQueueSort = "recent" | "name";

export type PublisherQueueOptions = {
  query: string;
  status: PublisherQueueStatusFilter;
  sort: PublisherQueueSort;
};

export const publisherQueueStatusOptions: PublisherQueueStatusFilter[] = ["all", ...salesScaleStatuses];

function searchablePublisherText(publisher: Publisher) {
  return [
    publisher.name,
    publisher.legal_entity,
    publisher.metadata?.property_name,
    publisher.metadata?.property_identifier
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function updatedAtTimestamp(publisher: Publisher) {
  if (!publisher.updated_at) return 0;
  const parsed = Date.parse(publisher.updated_at);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function filterAndSortPublisherQueue(publishers: Publisher[], options: PublisherQueueOptions) {
  const query = options.query.trim().toLocaleLowerCase();

  return publishers
    .filter((publisher) => options.status === "all" || publisher.sales_scale_status === options.status)
    .filter((publisher) => !query || searchablePublisherText(publisher).includes(query))
    .slice()
    .sort((left, right) => {
      if (options.sort === "name") {
        return left.name.localeCompare(right.name);
      }

      return updatedAtTimestamp(right) - updatedAtTimestamp(left) || left.name.localeCompare(right.name);
    });
}
