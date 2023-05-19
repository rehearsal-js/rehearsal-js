import { Base } from 'some-package';

class Something extends Base {
  constructor(...args) {
    super(...args);
    this.setRoutes({
      'enterprise-cookies': '/mypreferences/e/enterprise-cookies/',
      'feed.update': '/feed/update/:urn',
      'help.ads': '/help/linkedin/answer/62931',
      'help.binding-benefits': '/help/learning/answer/85873',
      'help.certificates': '/help/learning/answer/82977',
      'help.disability-answer-desk': '/help/linkedin/ask/DAD',
      'help.instructor-analytics': '/help/learning/answer/128146',
      'help.learning': '/help/learning',
      'help.learning-privacy': '/help/learning/answer/71996',
      'help.learning-progress': '/help/learning/answer/71903',
      'help.learning-teams': '/help/learning/answer/a1376782',
      'help.china': '/help/learning/answer/135087',
      'help.likes': '/help/learning/answer/82032',
      'help.lms-completion': '/help/learning/answer/129294',
      'help.lynda-subscriber': '/help/lynda/answer/90509',
      'help.questions-privacy': '/help/learning/answer/96677',
      'help.reviews': '/help/learning/answer/121936',
      'help.share-certificate': '/help/learning/answer/131504',
      'help.sync-learning-history': '/help/learning/answer/120457',
    });
  }
}
