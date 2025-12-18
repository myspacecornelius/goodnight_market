package com.nightmarket.core.dto;

import java.time.Instant;
import java.util.UUID;

public interface EnrichedFeedItemProjection {
    UUID getId();
    String getBody();
    Instant getCreatedAt();
    UUID getAuthorId();
    String getAuthorUsername();
    Long getLikeCount();
    Long getCommentCount();
    Boolean getViewerHasLiked();
}
