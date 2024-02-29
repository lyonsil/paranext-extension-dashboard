import 'src/shared/utils/array-manipulations.util';

import { PropsWithChildren, useContext, useEffect, useState } from "react";
import {NamedPairs, NamedPairsContext} from './namedpairs.context';
import { AquaService } from "src/shared/services/aqua.service";
//import { IndexedDbPersist } from "./services/indexeddb-persist.service";
//import { httpPapiFrontRequester } from "./utils/http.papifront.requester.util";
import {CurrentVerseContext } from "./currentverse.context";
import { Result } from "paranext-extension-dashboard";
import { VerseRef } from "@sillsdev/scripture";
import { groupBySelector } from 'src/shared/utils/array-manipulations.util';
import { EnvironmentContext } from './environment.context';

export function AquaNamedPairsDataContext({ children } : PropsWithChildren) {
  const verseRef = useContext(CurrentVerseContext);
  const environment = useContext(EnvironmentContext);
  if (!environment.requester)
    throw new Error("environment requester must be set for this service");
  const [namedPairsCollection, setNamedPairsCollection] = useState([] as NamedPairs[]);
  const [aquaService] = useState(new AquaService(
    'https://fxmhfbayk4.us-east-1.awsapprunner.com/v2',
    {
      // mode: 'no-cors',
      headers: {
        "api_key": "7cf43ae52dw8948ddb663f9cae24488a4",
        // origin: "https://fxmhfbayk4.us-east-1.awsapprunner.com",
      },
      // credentials: "include",
    },
    environment!.requester,
    environment.persist,
  ));

  class SettingsWebviewState {
    assessment_id: string | undefined;
    version_id: string | undefined;
  }
 const settings = window.getWebViewState<SettingsWebviewState>('_settings');
  if (!settings)
    return undefined;
  const assessmentId = settings.assessment_id;
  const versionId = settings.version_id;
  if (!assessmentId || !versionId)
    return undefined;

  const bookFromVerseRef = (verseRef: string | undefined): string | undefined =>
    (verseRef === undefined) ? undefined : new VerseRef(verseRef).book;
  const chapterFromVerseRef = (verseRef: string | undefined): string | undefined =>
    (verseRef === undefined) ? undefined : new VerseRef(verseRef).chapter;
  const verseFromVerseRef = (verseRef: string | undefined): string | undefined =>
    (verseRef === undefined) ? undefined : new VerseRef(verseRef).verse;

  const resultsToNamedPairsCollection = (results: Result[]): NamedPairs[] =>
    Object.entries(groupBySelector(results, (result: Result) => chapterFromVerseRef(result.vref)))
      .map<NamedPairs>(([name, results]) => (
        {
          name: name,
          data: results.map(result => ({
            x: verseFromVerseRef(result.vref),
            y: result.score
          }))  as [{ x: string; y: number; }]
        } as NamedPairs
      ));

  useEffect(() => {
    async function getResults() {
      try {
        const v = "GEN 1:5";
        const resultsForBook = await aquaService.getResults({assessment_id: parseInt(assessmentId!), book: bookFromVerseRef(v)});
        if (!ignore) {
          const namedPairCollection = resultsToNamedPairsCollection(resultsForBook);
          setNamedPairsCollection(namedPairCollection);
        }
      } catch(e) {
        console.error(e);
      }
    }
    let ignore = false;
    getResults();
    return () => {
      ignore = true;
    }
  }, [verseRef]);

  return (
    <>
      <NamedPairsContext.Provider value={namedPairsCollection}>
        {children}
      </NamedPairsContext.Provider>
    </>
  );
}
