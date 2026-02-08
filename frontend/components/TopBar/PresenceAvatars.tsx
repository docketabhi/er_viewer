'use client';

import { memo, useMemo, useEffect, useState } from 'react';
import {
  usePresence,
  createGuestUser,
  type CurrentUser,
} from '@/hooks/usePresence';
import type { ConnectionState } from '@/lib/websocket';

/**
 * User presence status.
 */
export type PresenceStatus = 'online' | 'editing' | 'idle' | 'offline';

/**
 * User presence data.
 */
export interface PresenceUser {
  /** Unique user identifier */
  id: string;
  /** User display name */
  name: string;
  /** Avatar image URL (optional) */
  avatarUrl?: string;
  /** User's presence status */
  status: PresenceStatus;
  /** Color for the user's cursor/highlight (optional) */
  color?: string;
}

/**
 * Props for the PresenceAvatars component.
 */
export interface PresenceAvatarsProps {
  /** List of users present in the document */
  users: PresenceUser[];
  /** Maximum number of avatars to display before collapsing */
  maxVisible?: number;
  /** Current user ID (to exclude from display or highlight) */
  currentUserId?: string;
  /** Callback when an avatar is clicked */
  onUserClick?: (user: PresenceUser) => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class */
  className?: string;
}

/**
 * Size configurations for avatars.
 */
const sizeConfig = {
  sm: {
    avatar: 'w-6 h-6 text-xs',
    status: 'w-2 h-2',
    overlap: '-ml-1.5',
    overflow: 'w-6 h-6 text-xs',
  },
  md: {
    avatar: 'w-8 h-8 text-sm',
    status: 'w-2.5 h-2.5',
    overlap: '-ml-2',
    overflow: 'w-8 h-8 text-sm',
  },
  lg: {
    avatar: 'w-10 h-10 text-base',
    status: 'w-3 h-3',
    overlap: '-ml-2.5',
    overflow: 'w-10 h-10 text-base',
  },
};

/**
 * Status color mapping.
 */
const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-green-500',
  editing: 'bg-blue-500',
  idle: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

/**
 * Default colors for users without a specified color.
 */
const defaultColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EF4444', // red
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

/**
 * Get initials from a name.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

/**
 * Get a deterministic color based on user ID.
 */
function getUserColor(userId: string, color?: string): string {
  if (color) return color;

  // Simple hash function for consistent color assignment
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return defaultColors[Math.abs(hash) % defaultColors.length];
}

/**
 * Individual avatar component.
 */
const Avatar = memo(function Avatar({
  user,
  sizes,
  showStatus = true,
  isFirst = false,
  onClick,
}: {
  user: PresenceUser;
  sizes: (typeof sizeConfig)['md'];
  showStatus?: boolean;
  isFirst?: boolean;
  onClick?: (user: PresenceUser) => void;
}) {
  const backgroundColor = getUserColor(user.id, user.color);
  const initials = getInitials(user.name);

  const handleClick = () => {
    onClick?.(user);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(user);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        presence-avatar
        relative
        ${sizes.avatar}
        ${!isFirst ? sizes.overlap : ''}
        rounded-full
        border-2 border-background
        overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:z-10
        transition-transform duration-150
        hover:scale-110 hover:z-10
      `}
      title={`${user.name} (${user.status})`}
      aria-label={`${user.name}, ${user.status}`}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-medium text-white"
          style={{ backgroundColor }}
        >
          {initials}
        </div>
      )}

      {/* Status indicator */}
      {showStatus && (
        <span
          className={`
            absolute bottom-0 right-0
            ${sizes.status}
            ${statusColors[user.status]}
            rounded-full
            border border-background
          `}
          aria-hidden="true"
        />
      )}
    </button>
  );
});

/**
 * Overflow indicator showing count of hidden users.
 */
const OverflowIndicator = memo(function OverflowIndicator({
  count,
  sizes,
  users,
}: {
  count: number;
  sizes: (typeof sizeConfig)['md'];
  users: PresenceUser[];
}) {
  const userNames = users.map((u) => u.name).join(', ');

  return (
    <div
      className={`
        presence-avatar-overflow
        relative
        ${sizes.overflow}
        ${sizes.overlap}
        rounded-full
        bg-muted
        border-2 border-background
        flex items-center justify-center
        font-medium text-muted-foreground
      `}
      title={userNames}
      aria-label={`${count} more users: ${userNames}`}
    >
      +{count}
    </div>
  );
});

/**
 * PresenceAvatars component displays users currently viewing/editing the diagram.
 *
 * Features:
 * - Avatar stack with overlap
 * - Status indicators (online, editing, idle, offline)
 * - Overflow indicator for many users
 * - Initials fallback for users without avatars
 * - Deterministic colors based on user ID
 *
 * @example
 * ```tsx
 * <PresenceAvatars
 *   users={[
 *     { id: '1', name: 'Alice', status: 'editing' },
 *     { id: '2', name: 'Bob', status: 'online', avatarUrl: '/bob.png' },
 *   ]}
 *   maxVisible={5}
 *   currentUserId="1"
 * />
 * ```
 */
export const PresenceAvatars = memo(function PresenceAvatars({
  users,
  maxVisible = 5,
  currentUserId,
  onUserClick,
  size = 'md',
  className = '',
}: PresenceAvatarsProps) {
  const sizes = sizeConfig[size];

  // Filter and sort users
  const displayUsers = useMemo(() => {
    // Filter out current user if specified
    const filteredUsers = currentUserId
      ? users.filter((u) => u.id !== currentUserId)
      : users;

    // Sort by status priority (editing > online > idle > offline)
    const statusOrder: Record<PresenceStatus, number> = {
      editing: 0,
      online: 1,
      idle: 2,
      offline: 3,
    };

    return [...filteredUsers].sort(
      (a, b) => statusOrder[a.status] - statusOrder[b.status]
    );
  }, [users, currentUserId]);

  // Split into visible and overflow
  const visibleUsers = displayUsers.slice(0, maxVisible);
  const overflowUsers = displayUsers.slice(maxVisible);
  const overflowCount = overflowUsers.length;

  // Don't render if no users to display
  if (displayUsers.length === 0) {
    return null;
  }

  return (
    <div
      className={`
        presence-avatars
        flex items-center
        ${className}
      `}
      role="group"
      aria-label={`${displayUsers.length} users present`}
    >
      {visibleUsers.map((user, index) => (
        <Avatar
          key={user.id}
          user={user}
          sizes={sizes}
          isFirst={index === 0}
          onClick={onUserClick}
        />
      ))}

      {overflowCount > 0 && (
        <OverflowIndicator
          count={overflowCount}
          sizes={sizes}
          users={overflowUsers}
        />
      )}
    </div>
  );
});

// =====================
// CONNECTION INDICATOR
// =====================

/**
 * Connection status color mapping.
 */
const connectionStatusColors: Record<ConnectionState, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500 animate-pulse',
  disconnected: 'bg-gray-400',
  error: 'bg-red-500',
};

/**
 * Connection status labels.
 */
const connectionStatusLabels: Record<ConnectionState, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
  error: 'Connection error',
};

/**
 * Props for ConnectionIndicator.
 */
export interface ConnectionIndicatorProps {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show label text */
  showLabel?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Connection indicator showing WebSocket connection status.
 */
export const ConnectionIndicator = memo(function ConnectionIndicator({
  connectionState,
  size = 'sm',
  showLabel = false,
  className = '',
}: ConnectionIndicatorProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div
      className={`
        connection-indicator
        flex items-center gap-1.5
        ${className}
      `}
      title={connectionStatusLabels[connectionState]}
      aria-label={connectionStatusLabels[connectionState]}
    >
      <span
        className={`
          ${dotSize}
          ${connectionStatusColors[connectionState]}
          rounded-full
        `}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={`${textSize} text-muted-foreground`}>
          {connectionStatusLabels[connectionState]}
        </span>
      )}
    </div>
  );
});

// =====================
// CONNECTED PRESENCE AVATARS
// =====================

/**
 * Props for ConnectedPresenceAvatars.
 */
export interface ConnectedPresenceAvatarsProps {
  /** Diagram ID to track presence for */
  diagramId: string | null;
  /** Current user info (if null, creates guest user) */
  currentUser?: CurrentUser | null;
  /** Whether the user is actively editing */
  isEditing?: boolean;
  /** Maximum avatars to show */
  maxVisible?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show connection indicator */
  showConnectionStatus?: boolean;
  /** Callback when an avatar is clicked */
  onUserClick?: (user: PresenceUser) => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * Connected PresenceAvatars with WebSocket integration.
 *
 * This component manages WebSocket connection and presence state automatically.
 * It shows other users viewing/editing the same diagram in real-time.
 *
 * @example
 * ```tsx
 * <ConnectedPresenceAvatars
 *   diagramId="abc123"
 *   currentUser={{ id: 'user1', displayName: 'Alice' }}
 *   isEditing={true}
 *   showConnectionStatus
 * />
 * ```
 */
export const ConnectedPresenceAvatars = memo(function ConnectedPresenceAvatars({
  diagramId,
  currentUser: providedUser,
  isEditing = false,
  maxVisible = 5,
  size = 'md',
  showConnectionStatus = false,
  onUserClick,
  className = '',
}: ConnectedPresenceAvatarsProps) {
  // Create or use guest user
  const [guestUser, setGuestUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    // Only create guest user on client side
    if (typeof window !== 'undefined' && !providedUser) {
      setGuestUser(createGuestUser());
    }
  }, [providedUser]);

  const currentUser = providedUser ?? guestUser;

  // Use presence hook
  const {
    users,
    connectionState,
    currentUserPresence,
  } = usePresence({
    diagramId,
    currentUser,
    isEditing,
  });

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Connection status indicator */}
      {showConnectionStatus && (
        <ConnectionIndicator
          connectionState={connectionState}
          size="sm"
        />
      )}

      {/* Presence avatars */}
      <PresenceAvatars
        users={users}
        maxVisible={maxVisible}
        currentUserId={currentUserPresence?.id}
        onUserClick={onUserClick}
        size={size}
      />

      {/* Show current user's avatar with status */}
      {currentUserPresence && (
        <Avatar
          user={currentUserPresence}
          sizes={sizeConfig[size]}
          isFirst
          showStatus
        />
      )}
    </div>
  );
});

export default PresenceAvatars;
