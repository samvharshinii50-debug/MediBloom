import { NativeModule, requireNativeModule } from 'expo';

declare class PdfRenderModule extends NativeModule<{}> {}

export default requireNativeModule<PdfRenderModule>('PdfRender');
