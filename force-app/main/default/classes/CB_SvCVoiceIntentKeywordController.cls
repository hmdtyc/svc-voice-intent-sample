public with sharing class CB_SvCVoiceIntentKeywordController {
    @AuraEnabled
   public static string getIntent(String text){
        Einstein_Language_Setting__mdt mdt = [SELECT MasterLabel, Model_ID__c, User_Name__c, Private_Key__c FROM Einstein_Language_Setting__mdt WHERE MasterLabel = 'Default' LIMIT 1];
        string accessToken = getAccessToken(mdt);
        List<Object> result = Language.intent(text, accessToken, mdt.Model_ID__c);
        return JSON.serialize(result);
   }
   private static string getAccessToken(Einstein_Language_Setting__mdt mdt){
        // Get a new token
        JWT jwt = new JWT('RS256');
        // jwt.cert = 'JWTCert'; // Uncomment this if you used a Salesforce certificate to sign up for an Einstein Platform account
        jwt.pkcs8 = mdt.Private_Key__c; // Comment this if you are using jwt.cert
        jwt.iss = 'developer.force.com';
        jwt.sub = mdt.User_Name__c;
        jwt.aud = 'https://api.einstein.ai/v2/oauth2/token';
        jwt.exp = '3600';
        String access_token = JWTBearerFlow.getAccessToken('https://api.einstein.ai/v2/oauth2/token', jwt);
        return access_token;    
   }
   @AuraEnabled(cacheable=true)
   public static List<KnowledgeArticle> getKnowledgeArticles(String keyword){
        String SOSL = 'FIND \''+ String.escapeSingleQuotes(String.escapeSingleQuotes(keyword)) + '\' IN ALL FIELDS ';
        SOSL += 'RETURNING KnowledgeArticleVersion(';
        SOSL += 'Id ';
        SOSL += ',KnowledgeArticleId ';
        SOSL += ',PublishStatus ';
        SOSL += ',VersionNumber ';
        SOSL += ',Title ';
        SOSL += ',Summary ';
        SOSL += ',ArticleNumber ';
        SOSL += ',LastPublishedDate ';

        // Condition
        SOSL += 'WHERE PublishStatus = \'Online\' ';
        SOSL += 'limit 20 ';
        SOSL += ') ';

        // Snippet
        SOSL += 'WITH SNIPPET ';

        Search.SearchResults searchResults = Search.find(SOSL);

        List<Search.SearchResult> sRList = searchResults.get('KnowledgeArticleVersion');
        List<KnowledgeArticle> articles = new List<KnowledgeArticle>();
        for(Search.SearchResult SR : sRList){
            KnowledgeArticle article = new KnowledgeArticle();
            article.articleVersion = (KnowledgeArticleVersion) SR.getSObject(); 
            article.snippet = SR.getSnippet();
            articles.add(article);
        }
        System.debug(articles);
        return articles;
   }
   public class KnowledgeArticle{
       @AuraEnabled
       public KnowledgeArticleVersion articleVersion;
       @AuraEnabled
       public String snippet;
   } 
}
