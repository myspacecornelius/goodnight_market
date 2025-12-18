package com.nightmarket.core.dto;

import java.time.Instant;
import java.util.UUID;

public record EnrichedFeedItemDto(
    UUID id,
    String body,
    Instant createdAt,
    UUID authorId,
    String authorUsername,
    Long likeCount,
    Long commentCount,
    Boolean viewerHasLiked
) {}
