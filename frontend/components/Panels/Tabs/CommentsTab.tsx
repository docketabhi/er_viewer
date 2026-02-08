'use client';

import {
  useState,
  useCallback,
  memo,
} from 'react';

/**
 * Props for the CommentsTab component.
 */
export interface CommentsTabProps {
  /** Currently selected diagram ID */
  diagramId?: string;
  /** Comments list */
  comments?: Comment[];
  /** Current user ID for identifying own comments */
  currentUserId?: string;
  /** Callback when a new comment is added */
  onAddComment?: (content: string) => void;
  /** Callback when a comment is deleted */
  onDeleteComment?: (commentId: string) => void;
  /** Callback when a comment is resolved/unresolved */
  onToggleResolved?: (commentId: string, resolved: boolean) => void;
  /** Whether comments are loading */
  isLoading?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Comment structure.
 */
export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: Date;
  resolved: boolean;
  entityKey?: string;
}

/**
 * Format relative time for display.
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Avatar component with fallback initials.
 */
const Avatar = memo(function Avatar({
  name,
  imageUrl,
  size = 'md',
}: {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md';
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`
        ${sizeClasses}
        rounded-full
        bg-primary/10
        text-primary
        flex items-center justify-center
        font-medium
      `}
    >
      {initials}
    </div>
  );
});

/**
 * Single comment item component.
 */
const CommentItem = memo(function CommentItem({
  comment,
  isOwn,
  onDelete,
  onToggleResolved,
}: {
  comment: Comment;
  isOwn: boolean;
  onDelete?: () => void;
  onToggleResolved?: (resolved: boolean) => void;
}) {
  return (
    <div
      className={`
        p-3
        rounded-lg
        border border-border
        ${comment.resolved ? 'bg-muted/30 opacity-60' : 'bg-background'}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <Avatar name={comment.authorName} imageUrl={comment.authorAvatar} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {comment.authorName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          {comment.entityKey && (
            <span className="
              text-[10px]
              px-1.5 py-0.5
              rounded
              bg-primary/10
              text-primary
              font-medium
            ">
              @{comment.entityKey}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
        {comment.content}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => onToggleResolved?.(!comment.resolved)}
          className="
            text-xs
            text-muted-foreground
            hover:text-foreground
            transition-colors
          "
        >
          {comment.resolved ? 'Unresolve' : 'Resolve'}
        </button>
        {isOwn && (
          <button
            type="button"
            onClick={onDelete}
            className="
              text-xs
              text-muted-foreground
              hover:text-destructive
              transition-colors
            "
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
});

/**
 * Comment input component.
 */
const CommentInput = memo(function CommentInput({
  onSubmit,
}: {
  onSubmit: (content: string) => void;
}) {
  const [content, setContent] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (content.trim()) {
        onSubmit(content.trim());
        setContent('');
      }
    },
    [content, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (content.trim()) {
          onSubmit(content.trim());
          setContent('');
        }
      }
    },
    [content, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-border">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment..."
        className="
          w-full
          px-3 py-2
          text-sm
          bg-background
          border border-border
          rounded-lg
          resize-none
          focus:outline-none
          focus:ring-2
          focus:ring-primary/50
          focus:border-primary
          placeholder:text-muted-foreground
        "
        rows={3}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">
          {'\u2318'}+Enter to submit
        </span>
        <button
          type="submit"
          disabled={!content.trim()}
          className="
            px-3 py-1.5
            text-xs font-medium
            bg-primary
            text-primary-foreground
            rounded
            hover:bg-primary/90
            disabled:opacity-50
            disabled:cursor-not-allowed
            transition-colors
          "
        >
          Comment
        </button>
      </div>
    </form>
  );
});

/**
 * Empty state component.
 */
const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="
        w-12 h-12
        rounded-full
        bg-muted
        flex items-center justify-center
        mb-3
      ">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-6 h-6 text-muted-foreground"
        >
          <path
            fillRule="evenodd"
            d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 001.28.53l3.58-3.579a.78.78 0 01.527-.224 41.202 41.202 0 005.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zm0 7a1 1 0 100-2 1 1 0 000 2zM8 8a1 1 0 11-2 0 1 1 0 012 0zm5 1a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">
        No comments yet
      </h3>
      <p className="text-xs text-muted-foreground">
        Be the first to add a comment to this diagram.
      </p>
    </div>
  );
});

/**
 * Loading state component.
 */
const LoadingState = memo(function LoadingState() {
  return (
    <div className="space-y-3 p-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border animate-pulse"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-24 mb-1" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * CommentsTab component for displaying and managing diagram comments.
 *
 * Features:
 * - View comments from collaborators
 * - Add new comments
 * - Resolve/unresolve comments
 * - Delete own comments
 * - Entity-linked comments
 *
 * @example
 * ```tsx
 * <CommentsTab
 *   diagramId="diagram-123"
 *   comments={commentsList}
 *   currentUserId="user-456"
 *   onAddComment={(content) => addComment(content)}
 *   onDeleteComment={(id) => deleteComment(id)}
 *   onToggleResolved={(id, resolved) => toggleResolved(id, resolved)}
 * />
 * ```
 */
export const CommentsTab = memo(function CommentsTab({
  comments = [],
  currentUserId,
  onAddComment,
  onDeleteComment,
  onToggleResolved,
  isLoading = false,
  className = '',
}: CommentsTabProps) {
  const [showResolved, setShowResolved] = useState(false);

  const filteredComments = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);

  const resolvedCount = comments.filter((c) => c.resolved).length;

  const handleAddComment = useCallback(
    (content: string) => {
      onAddComment?.(content);
    },
    [onAddComment]
  );

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      onDeleteComment?.(commentId);
    },
    [onDeleteComment]
  );

  const handleToggleResolved = useCallback(
    (commentId: string, resolved: boolean) => {
      onToggleResolved?.(commentId, resolved);
    },
    [onToggleResolved]
  );

  return (
    <div
      className={`
        comments-tab
        h-full
        flex flex-col
        overflow-hidden
        ${className}
      `}
    >
      {/* Header with filter */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">
          {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </span>
        {resolvedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowResolved(!showResolved)}
            className="
              text-xs
              text-muted-foreground
              hover:text-foreground
              transition-colors
            "
          >
            {showResolved ? 'Hide' : 'Show'} resolved ({resolvedCount})
          </button>
        )}
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingState />
        ) : filteredComments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-3 space-y-3">
            {filteredComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isOwn={comment.authorId === currentUserId}
                onDelete={() => handleDeleteComment(comment.id)}
                onToggleResolved={(resolved) =>
                  handleToggleResolved(comment.id, resolved)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Comment Input */}
      <CommentInput onSubmit={handleAddComment} />
    </div>
  );
});

export default CommentsTab;
