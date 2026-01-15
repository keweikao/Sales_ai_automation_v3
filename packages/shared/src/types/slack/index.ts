/**
 * Slack integration types
 * Types for Slack notifications and integration
 */

export interface SlackUserInfo {
  id: string;
  username?: string;
  email?: string;
  name?: string;
}

export interface SlackChannelInfo {
  id: string;
  name?: string;
}

export interface SlackFileInfo {
  id: string;
  name: string;
  title?: string;
  mimetype?: string;
  filetype?: string;
  size: number;
  url_private?: string;
  url_private_download?: string;
}

export interface SlackMessageInfo {
  channel: string;
  threadTs?: string;
  text: string;
  blocks?: unknown[]; // Avoid direct dependency on @slack/web-api
}
