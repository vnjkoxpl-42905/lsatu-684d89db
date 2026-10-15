import React from "react";
import arrowBack from "ionicons/dist/svg/arrow-back-outline.svg?raw";
import search from "ionicons/dist/svg/search.svg?raw";
import expand from "ionicons/dist/svg/expand-outline.svg?raw";
import contract from "ionicons/dist/svg/contract-outline.svg?raw";
import bookmark from "ionicons/dist/svg/bookmark.svg?raw";
import settings from "ionicons/dist/svg/settings.svg?raw";
import speedometer from "ionicons/dist/svg/speedometer.svg?raw";
import list from "ionicons/dist/svg/list.svg?raw";
import keypad from "ionicons/dist/svg/keypad.svg?raw";
import book from "ionicons/dist/svg/book.svg?raw";
import pricetag from "ionicons/dist/svg/pricetag.svg?raw";
import school from "ionicons/dist/svg/school.svg?raw";
import person from "ionicons/dist/svg/person.svg?raw";
import addCircle from "ionicons/dist/svg/add-circle.svg?raw";
import documentText from "ionicons/dist/svg/document-text.svg?raw";
import eye from "ionicons/dist/svg/eye.svg?raw";
import eyeOff from "ionicons/dist/svg/eye-off.svg?raw";
import image from "ionicons/dist/svg/image.svg?raw";
import create from "ionicons/dist/svg/create.svg?raw";
import trash from "ionicons/dist/svg/trash.svg?raw";
import apps from "ionicons/dist/svg/apps.svg?raw";
import personCircle from "ionicons/dist/svg/person-circle.svg?raw";
import play from "ionicons/dist/svg/play.svg?raw";
import refresh from "ionicons/dist/svg/refresh.svg?raw";
import shareSocial from "ionicons/dist/svg/share-social.svg?raw";
import flag from "ionicons/dist/svg/flag.svg?raw";
import statsChart from "ionicons/dist/svg/stats-chart.svg?raw";
import sparkles from "ionicons/dist/svg/sparkles.svg?raw";
import copy from "ionicons/dist/svg/copy.svg?raw";
import cloudUpload from "ionicons/dist/svg/cloud-upload.svg?raw";
import logOut from "ionicons/dist/svg/log-out.svg?raw";
import close from "ionicons/dist/svg/close.svg?raw";
import menu from "ionicons/dist/svg/menu.svg?raw";

/**
 * Ionicons (MIT), the icon set Spreeder's reader header uses. Spreeder's own
 * icon font (gauge, view-text, keyboard) is substituted with the nearest
 * Ionicon; see research/2026-10-13-spreeder-reconstruction-spec.md section 1.
 */
const ICONS = {
  arrowBack, search, expand, contract, bookmark, settings, speedometer, list, keypad, book, pricetag,
  school, person, addCircle, documentText, eye, eyeOff, image, create, trash, apps, personCircle, play,
  refresh, shareSocial, flag, statsChart, sparkles, copy, cloudUpload, logOut, close, menu,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, className = "", style }: { name: IconName; size?: number; className?: string; style?: React.CSSProperties }): React.ReactElement {
  return (
    <span
      aria-hidden
      className={`rc-icon inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size, ...style }}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

/** Material Icons ligature (Apache 2.0), used by Spreeder's dialogs and menus. */
export function MIcon({ name, size = 24, className = "", style }: { name: string; size?: number; className?: string; style?: React.CSSProperties }): React.ReactElement {
  return (
    <span aria-hidden className={`material-icons select-none ${className}`} style={{ fontSize: size, width: size, height: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}
