import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {DevSupport} from "@react-buddy/ide-toolbox";
import {ComponentPreviews, useInitial} from "./dev";
import {registerPreloadErrorHandler} from "./utils/lazyWithRetry";
import {installGlobalErrorHandlers} from "./utils/logger";

installGlobalErrorHandlers();
registerPreloadErrorHandler();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <DevSupport ComponentPreviews={ComponentPreviews}
                    useInitialHook={useInitial}
        >
            <App/>
        </DevSupport>
    </StrictMode>,
)
