package com.nightmarket.core.repository;

import com.nightmarket.core.domain.Post;
import com.nightmarket.core.dto.EnrichedFeedItemProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface PostRepository extends JpaRepository<Post, UUID> {

    @Query(value = """
        SELECT 
            p.id, 
            p.body, 
            p.created_at as createdAt,
            u.id as authorId, 
            u.username as authorUsername,
            COALESCE(lc.like_count, 0) as likeCount,
            COALESCE(cc.comment_count, 0) as commentCount,
            CASE WHEN l.id IS NOT NULL THEN TRUE ELSE FALSE END as viewerHasLiked
        FROM posts p
        JOIN users u ON p.author_id = u.id
        -- Only show posts from followed users
        JOIN follows f ON p.author_id = f.followee_id AND f.follower_id = :viewerId
        
        -- Join likes to check if viewer has liked
        LEFT JOIN likes l ON l.post_id = p.id AND l.user_id = :viewerId
        
        -- Aggregate likes
        LEFT JOIN (
            SELECT post_id, COUNT(*) as like_count 
            FROM likes 
            GROUP BY post_id
        ) lc ON lc.post_id = p.id
        
        -- Aggregate comments
        LEFT JOIN (
            SELECT post_id, COUNT(*) as comment_count 
            FROM comments 
            GROUP BY post_id
        ) cc ON cc.post_id = p.id
        
        WHERE NOT EXISTS (
            SELECT 1 FROM blocks b 
            WHERE (b.blocker_id = :viewerId AND b.blocked_id = p.author_id)
               OR (b.blocker_id = p.author_id AND b.blocked_id = :viewerId)
        )
        AND (
            cast(:cursorCreatedAt as timestamp with time zone) IS NULL 
            OR (p.created_at < :cursorCreatedAt) 
            OR (p.created_at = :cursorCreatedAt AND p.id < :cursorId)
        )
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<EnrichedFeedItemProjection> getEnrichedFeed(
        @Param("viewerId") UUID viewerId,
        @Param("cursorCreatedAt") Instant cursorCreatedAt,
        @Param("cursorId") UUID cursorId,
        @Param("limit") int limit
    );
}
