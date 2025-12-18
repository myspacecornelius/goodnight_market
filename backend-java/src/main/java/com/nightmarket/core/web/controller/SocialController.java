package com.nightmarket.core.web.controller;

import com.nightmarket.core.dto.EnrichedFeedItemDto;
import com.nightmarket.core.service.SocialService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/social")
@RequiredArgsConstructor
public class SocialController {

    private final SocialService socialService;

    @GetMapping("/feed")
    public ResponseEntity<List<EnrichedFeedItemDto>> getFeed(
            Authentication authentication,
            @RequestParam(required = false) Instant cursorCreatedAt,
            @RequestParam(required = false) UUID cursorId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        // Assuming authentication.getName() returns the user ID (subject from JWT)
        UUID viewerId = UUID.fromString(authentication.getName());

        List<EnrichedFeedItemDto> feed = socialService.getFeed(
                viewerId,
                cursorCreatedAt,
                cursorId,
                limit
        );
        return ResponseEntity.ok(feed);
    }
}
