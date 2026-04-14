export interface AbstractionSection {
  id: string;
  title: string;
  body: string;
}

export interface AbstractionModule {
  id: string;
  title: string;
  description: string;
  sections: AbstractionSection[];
}
