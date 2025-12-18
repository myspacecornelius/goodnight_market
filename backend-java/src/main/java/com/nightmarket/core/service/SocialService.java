package com.nightmarket.core.service;

import com.nightmarket.core.dto.EnrichedFeedItemDto;
import com.nightmarket.core.dto.EnrichedFeedItemProjection;
import com.nightmarket.core.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SocialService {

    private final PostRepository postRepository;

    @Transactional(readOnly = true)
    public List<EnrichedFeedItemDto> getFeed(
            UUID viewerId,
            Instant cursorCreatedAt,
            UUID cursorId,
            int limit
    ) {
        if (limit > 50) limit = 50;
        if (limit < 1) limit = 20;

        List<EnrichedFeedItemProjection> projections = postRepository.getEnrichedFeed(
                viewerId, cursorCreatedAt, cursorId, limit
        );

        return projections.stream()
                .map(p -> new EnrichedFeedItemDto(
                        p.getId(),
                        p.getBody(),
                        p.getCreatedAt(),
                        p.getAuthorId(),
                        p.getAuthorUsername(),
                        p.getLikeCount(),
                        p.getCommentCount(),
                        p.getViewerHasLiked()
                ))
                .toList();
    }
}
