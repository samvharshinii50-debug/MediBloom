import { registerWebModule, NativeModule } from 'expo';

class PdfRenderModule extends NativeModule<{}> {}

export default registerWebModule(PdfRenderModule, 'PdfRenderModule');
