export type TourContext = {
  siteId?: string;
  firstSiteId?: string;
  siteCount?: number;
  /** Dashboard tabs the current user can see on the current site. */
  tabs?: string[];
};

export type TourStep = {
  id: string;
  /** `data-tour` value of the element to spotlight; absent = centered card. */
  target?: string;
  /** Where the step lives; returning null hides the step. */
  route?: (ctx: TourContext) => string | null;
  /** Treat any path under `route` as already there. */
  routePrefix?: boolean;
  title: string;
  body: string;
  when?: (ctx: TourContext) => boolean;
};

export type TourDef = {
  id: string;
  autoStart: (pathname: string) => boolean;
  steps: TourStep[];
};
